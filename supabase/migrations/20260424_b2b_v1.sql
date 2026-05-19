-- B2B V1: Private groups, join requests, group discussions, allow agent voting.

-- 1. Add is_private flag to groups
alter table agent_groups
  add column if not exists is_private boolean not null default false;

create index if not exists idx_agent_groups_is_private on agent_groups(is_private);

-- 2. Join requests for private groups
do $$
begin
  if not exists (select 1 from pg_type where typname = 'join_request_status') then
    create type join_request_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

create table if not exists group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references agent_groups(id) on delete cascade,
  agent_id uuid not null references profiles(id) on delete cascade,
  status join_request_status not null default 'pending',
  message text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, agent_id, status)
);

create index if not exists idx_group_join_requests_group on group_join_requests(group_id, status);
create index if not exists idx_group_join_requests_agent on group_join_requests(agent_id, status);

alter table group_join_requests enable row level security;

create policy "join requests own read" on group_join_requests
for select using (
  agent_id = auth.uid()
  or exists (
    select 1 from agent_group_members m
    where m.group_id = group_join_requests.group_id
      and m.agent_id = auth.uid()
      and m.role = 'owner'
  )
  or is_admin(auth.uid())
);

create policy "join requests agent create" on group_join_requests
for insert with check (
  agent_id = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'agent' and p.verification_status = 'verified'
  )
);

create policy "join requests owner update" on group_join_requests
for update using (
  exists (
    select 1 from agent_group_members m
    where m.group_id = group_join_requests.group_id
      and m.agent_id = auth.uid()
      and m.role = 'owner'
  )
  or is_admin(auth.uid())
)
with check (
  exists (
    select 1 from agent_group_members m
    where m.group_id = group_join_requests.group_id
      and m.agent_id = auth.uid()
      and m.role = 'owner'
  )
  or is_admin(auth.uid())
);

-- 3. Allow agents to vote on answers (B2B model — was consumer-only)
drop policy if exists "answer votes consumer insert" on answer_votes;
drop policy if exists "answer votes consumer update" on answer_votes;
drop policy if exists "answer votes consumer delete" on answer_votes;

create policy "answer votes agent insert" on answer_votes
for insert with check (
  consumer_id = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role in ('agent', 'admin')
      and (p.role = 'admin' or p.verification_status = 'verified')
  )
);

create policy "answer votes own update" on answer_votes
for update using (consumer_id = auth.uid())
with check (consumer_id = auth.uid());

create policy "answer votes own delete" on answer_votes
for delete using (consumer_id = auth.uid() or is_admin(auth.uid()));

-- 4. Allow agents to vote on tips (was consumer-only)
drop policy if exists "agent tip votes consumer insert" on agent_tip_votes;
drop policy if exists "agent tip votes consumer update" on agent_tip_votes;
drop policy if exists "agent tip votes consumer delete" on agent_tip_votes;

create policy "agent tip votes agent insert" on agent_tip_votes
for insert with check (
  consumer_id = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role in ('agent', 'admin')
      and (p.role = 'admin' or p.verification_status = 'verified')
  )
);

create policy "agent tip votes own update" on agent_tip_votes
for update using (consumer_id = auth.uid())
with check (consumer_id = auth.uid());

create policy "agent tip votes own delete" on agent_tip_votes
for delete using (consumer_id = auth.uid() or is_admin(auth.uid()));

-- 5. Allow agents to ask questions (was consumer-only)
drop policy if exists "consumer create own question" on questions;

create policy "agent create own question" on questions
for insert with check (
  asked_by = auth.uid() and
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role in ('agent', 'admin')
      and (p.role = 'admin' or p.verification_status = 'verified')
  )
);

-- 6. Update messages policy: only verified agents (and admin) can send
drop policy if exists "messages send" on messages;

create policy "messages send verified" on messages
for insert with check (
  sender_id = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role in ('agent', 'admin')
      and (p.role = 'admin' or p.verification_status = 'verified')
  )
);

-- 7. Add group context to questions (optional link to a group)
alter table questions
  add column if not exists group_id uuid references agent_groups(id) on delete set null;

create index if not exists idx_questions_group on questions(group_id, created_at desc);

-- 8. Updated_at trigger for join requests
create trigger group_join_requests_set_updated_at
  before update on group_join_requests
  for each row execute function set_updated_at();

-- ============================================================
-- MäklarForum: Group Polls + Default Group
-- Run this in Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Group Polls table
create table if not exists group_polls (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references agent_groups(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  options jsonb not null default '[]'::jsonb,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2. Group Poll Votes table
create table if not exists group_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references group_polls(id) on delete cascade,
  voter_id uuid not null references profiles(id) on delete cascade,
  option_index int not null,
  created_at timestamptz not null default now(),
  unique(poll_id, voter_id)
);

-- 3. RLS policies
alter table group_polls enable row level security;
alter table group_poll_votes enable row level security;

create policy "Authenticated users can read polls"
  on group_polls for select to authenticated
  using (true);

create policy "Members can create polls"
  on group_polls for insert to authenticated
  with check (
    exists (
      select 1 from agent_group_members
      where agent_group_members.group_id = group_polls.group_id
        and agent_group_members.agent_id = auth.uid()
    )
  );

create policy "Authenticated users can read poll votes"
  on group_poll_votes for select to authenticated
  using (true);

create policy "Authenticated users can vote"
  on group_poll_votes for insert to authenticated
  with check (voter_id = auth.uid());

create policy "Users can change their vote"
  on group_poll_votes for delete to authenticated
  using (voter_id = auth.uid());

-- 4. Add is_default column to agent_groups
alter table agent_groups add column if not exists is_default boolean not null default false;

-- 5. Create the default group "Sveriges Fastighetsmäklare"
insert into agent_groups (name, slug, description, municipality, region, status, is_private, is_default, created_by)
select
  'Sveriges Fastighetsmäklare',
  'sveriges-fastighetsmaklare',
  'Standardgruppen för alla verifierade mäklare på MäklarForum. Här samlas hela communityt.',
  'Sverige',
  'Sverige',
  'approved',
  false,
  true,
  (select id from profiles where role = 'admin' limit 1)
where not exists (
  select 1 from agent_groups where slug = 'sveriges-fastighetsmaklare'
);

-- 6. Add all current verified agents to the default group
insert into agent_group_members (group_id, agent_id, role)
select g.id, p.id, 'member'
from agent_groups g
cross join profiles p
where g.slug = 'sveriges-fastighetsmaklare'
  and (p.role = 'agent' and p.verification_status = 'verified' or p.role = 'admin')
  and not exists (
    select 1 from agent_group_members m
    where m.group_id = g.id and m.agent_id = p.id
  );

-- 7. Performance indexes
create index if not exists idx_group_polls_group_id on group_polls(group_id);
create index if not exists idx_group_poll_votes_poll_id on group_poll_votes(poll_id);
create index if not exists idx_group_poll_votes_voter on group_poll_votes(voter_id);

-- ============================================================
-- MäklarForum: Combined Migration Script
-- Run this in Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ============================================================
-- 1. INIT (20260218_init.sql)
-- ============================================================

create extension if not exists "pgcrypto";

create type app_role as enum ('consumer', 'agent', 'admin');
create type verification_status as enum ('pending', 'verified', 'suspended');
create type audience_type as enum ('buyer', 'seller', 'general');
create type question_category as enum ('kopa', 'salja', 'juridik', 'vardering', 'flytt', 'ovrigt');
create type geo_scope as enum ('local', 'regional', 'open');
create type question_status as enum ('open', 'answered', 'closed');
create type forum_category as enum ('juridik', 'budgivning', 'teknik', 'rekrytering', 'allmant');
create type listing_status as enum ('active', 'sold');
create type report_content_type as enum ('answer', 'comment', 'forum_post');
create type report_status as enum ('pending', 'reviewed', 'actioned');
create type subscription_status as enum ('none', 'trial', 'active', 'past_due', 'canceled');

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'consumer',
  full_name text not null,
  email text not null unique,
  avatar_url text,
  fmi_number text,
  firm text,
  title text,
  bio text,
  city text,
  verification_status verification_status not null default 'pending',
  profile_slug text unique,
  notification_prefs jsonb not null default jsonb_build_object('new_question_email', 'immediate', 'new_message_email', 'immediate'),
  subscription_status subscription_status not null default 'none',
  stripe_customer_id text,
  stripe_subscription_id text,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_areas (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references profiles(id) on delete cascade,
  municipality text not null,
  region text not null,
  created_at timestamptz not null default now(),
  unique (agent_id, municipality)
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  asked_by uuid not null references profiles(id) on delete cascade,
  title text not null,
  question_slug text not null unique,
  body text not null,
  audience audience_type not null,
  category question_category not null,
  geo_scope geo_scope not null,
  municipality text,
  region text,
  status question_status not null default 'open',
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  answered_by uuid not null references profiles(id) on delete cascade,
  body text not null,
  helpful_votes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, answered_by)
);

create table if not exists answer_comments (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references answers(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  unique (answer_id, author_id)
);

create table if not exists question_watchers (
  question_id uuid not null references questions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  category forum_category not null,
  title text not null,
  body text not null,
  reply_count integer not null default 0,
  is_recruiting boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists agent_listings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  price integer not null,
  area text not null,
  image_url text,
  hemnet_url text,
  status listing_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists reported_content (
  id uuid primary key default gen_random_uuid(),
  reported_by uuid not null references profiles(id) on delete cascade,
  content_type report_content_type not null,
  content_id uuid not null,
  reason text not null,
  status report_status not null default 'pending',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table agent_areas enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table answer_comments enable row level security;
alter table question_watchers enable row level security;
alter table messages enable row level security;
alter table forum_posts enable row level security;
alter table agent_listings enable row level security;
alter table reported_content enable row level security;

create or replace function is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

create policy "profiles public read" on profiles
for select using (true);

create policy "profiles self update" on profiles
for update using (id = auth.uid())
with check (id = auth.uid());

create policy "questions public read" on questions
for select using (true);

create policy "consumer create own question" on questions
for insert with check (
  asked_by = auth.uid() and
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consumer')
);

create policy "agent answer only when verified" on answers
for insert with check (
  answered_by = auth.uid() and
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'agent' and p.verification_status = 'verified'
  )
);

create policy "answers public read" on answers
for select using (true);

create policy "answer comment only owner once" on answer_comments
for insert with check (
  author_id = auth.uid() and
  exists (select 1 from answers a where a.id = answer_id and a.answered_by = auth.uid())
);

create policy "answer comments public read" on answer_comments
for select using (true);

create policy "messages private" on messages
for select using (sender_id = auth.uid() or receiver_id = auth.uid() or is_admin(auth.uid()));

create policy "messages send" on messages
for insert with check (sender_id = auth.uid());

create policy "forum verified only" on forum_posts
for select using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'agent' and p.verification_status = 'verified'
  ) or is_admin(auth.uid())
);

create policy "forum write verified only" on forum_posts
for insert with check (
  author_id = auth.uid() and
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'agent' and p.verification_status = 'verified'
  )
);

create policy "reported content admin only" on reported_content
for all using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "admin full read profiles" on profiles
for select using (is_admin(auth.uid()));

create policy "admin manage questions" on questions
for all using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "admin manage answers" on answers
for all using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "admin manage listings" on agent_listings
for all using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

-- ============================================================
-- 2. BILLING (20260218_billing.sql)
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'processing_status') then
    create type processing_status as enum ('pending', 'processed', 'failed');
  end if;
end
$$;

create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  status processing_status not null default 'processed',
  created_at timestamptz not null default now()
);

create table if not exists fortnox_sync_queue (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  reference_id text not null,
  payload jsonb not null,
  status processing_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table billing_events enable row level security;
alter table fortnox_sync_queue enable row level security;

create policy "billing events admin read" on billing_events
for select using (is_admin(auth.uid()));

create policy "fortnox queue admin read" on fortnox_sync_queue
for select using (is_admin(auth.uid()));

-- ============================================================
-- 3. GROUPS, LEADS, MODERATION (20260219_groups_leads_moderation.sql)
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'group_status') then
    create type group_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'group_member_role') then
    create type group_member_role as enum ('owner', 'member');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'moderation_item_type') then
    create type moderation_item_type as enum ('answer');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'moderation_status') then
    create type moderation_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_dispatch_type') then
    create type lead_dispatch_type as enum ('tip', 'lead');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_dispatch_status') then
    create type lead_dispatch_status as enum ('queued', 'sent', 'failed');
  end if;
end
$$;

create table if not exists agent_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  municipality text,
  region text,
  status group_status not null default 'pending',
  created_by uuid not null references profiles(id) on delete cascade,
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_group_members (
  group_id uuid not null references agent_groups(id) on delete cascade,
  agent_id uuid not null references profiles(id) on delete cascade,
  role group_member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (group_id, agent_id)
);

create table if not exists moderation_queue (
  id uuid primary key default gen_random_uuid(),
  item_type moderation_item_type not null,
  question_id uuid references questions(id) on delete cascade,
  proposed_by uuid not null references profiles(id) on delete cascade,
  body text not null,
  blocked_terms text[] not null default '{}',
  status moderation_status not null default 'pending',
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists lead_dispatch_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references profiles(id) on delete cascade,
  question_id uuid references questions(id) on delete set null,
  dispatch_type lead_dispatch_type not null,
  status lead_dispatch_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  dispatched_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_groups_status on agent_groups(status);
create index if not exists idx_agent_groups_geo on agent_groups(region, municipality);
create index if not exists idx_agent_group_members_agent on agent_group_members(agent_id);
create index if not exists idx_moderation_queue_status on moderation_queue(status, created_at);
create index if not exists idx_lead_dispatch_logs_agent on lead_dispatch_logs(agent_id, created_at desc);

alter table agent_groups enable row level security;
alter table agent_group_members enable row level security;
alter table moderation_queue enable row level security;
alter table lead_dispatch_logs enable row level security;

create policy "agent groups approved read" on agent_groups
for select using (
  status = 'approved'
  or created_by = auth.uid()
  or is_admin(auth.uid())
);

create policy "agent groups create" on agent_groups
for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and (p.role = 'agent' or p.role = 'admin')
  )
);

create policy "agent groups owner update pending" on agent_groups
for update using (created_by = auth.uid() and status = 'pending')
with check (created_by = auth.uid() and status = 'pending');

create policy "agent groups admin update" on agent_groups
for update using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "agent group members read" on agent_group_members
for select using (
  agent_id = auth.uid()
  or exists (
    select 1 from agent_groups g
    where g.id = group_id and (g.status = 'approved' or g.created_by = auth.uid())
  )
  or is_admin(auth.uid())
);

create policy "agent group members join" on agent_group_members
for insert with check (
  agent_id = auth.uid()
  and exists (
    select 1
    from agent_groups g
    join profiles p on p.id = auth.uid()
    where g.id = group_id
      and (g.status = 'approved' or g.created_by = auth.uid())
      and (p.role = 'agent' or p.role = 'admin')
  )
);

create policy "agent group members leave" on agent_group_members
for delete using (agent_id = auth.uid() or is_admin(auth.uid()));

create policy "moderation queue insert by agent" on moderation_queue
for insert with check (
  proposed_by = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'agent'
  )
);

create policy "moderation queue admin read" on moderation_queue
for select using (is_admin(auth.uid()));

create policy "moderation queue admin update" on moderation_queue
for update using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "lead dispatch logs own read" on lead_dispatch_logs
for select using (agent_id = auth.uid() or is_admin(auth.uid()));

create policy "lead dispatch logs own insert" on lead_dispatch_logs
for insert with check (agent_id = auth.uid() or is_admin(auth.uid()));

-- ============================================================
-- 4. QNA VOTES, BLOCKS, TIPS (20260219_qna_votes_blocks_tips.sql)
-- ============================================================

create table if not exists answer_votes (
  answer_id uuid not null references answers(id) on delete cascade,
  consumer_id uuid not null references profiles(id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (answer_id, consumer_id)
);

create table if not exists user_blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists agent_tips (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  audience audience_type not null default 'general',
  geo_scope geo_scope not null default 'open',
  municipality text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_tip_votes (
  tip_id uuid not null references agent_tips(id) on delete cascade,
  consumer_id uuid not null references profiles(id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tip_id, consumer_id)
);

create index if not exists idx_answer_votes_answer on answer_votes(answer_id);
create index if not exists idx_answer_votes_consumer on answer_votes(consumer_id);
create index if not exists idx_user_blocks_blocked on user_blocks(blocked_id);
create index if not exists idx_agent_tips_geo on agent_tips(geo_scope, region, municipality);
create index if not exists idx_agent_tips_author on agent_tips(author_id, created_at desc);
create index if not exists idx_agent_tip_votes_tip on agent_tip_votes(tip_id);

alter table answer_votes enable row level security;
alter table user_blocks enable row level security;
alter table agent_tips enable row level security;
alter table agent_tip_votes enable row level security;

create policy "answer votes public read" on answer_votes
for select using (true);

create policy "answer votes consumer insert" on answer_votes
for insert with check (
  consumer_id = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'consumer'
  )
);

create policy "answer votes consumer update" on answer_votes
for update using (consumer_id = auth.uid())
with check (consumer_id = auth.uid());

create policy "answer votes consumer delete" on answer_votes
for delete using (consumer_id = auth.uid());

create policy "user blocks own read" on user_blocks
for select using (blocker_id = auth.uid() or blocked_id = auth.uid() or is_admin(auth.uid()));

create policy "user blocks consumer insert" on user_blocks
for insert with check (
  blocker_id = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'consumer'
  )
);

create policy "user blocks consumer delete" on user_blocks
for delete using (blocker_id = auth.uid() or is_admin(auth.uid()));

create policy "agent tips public read" on agent_tips
for select using (true);

create policy "agent tips verified agent insert" on agent_tips
for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'agent' and p.verification_status = 'verified'
  )
);

create policy "agent tips author update" on agent_tips
for update using (author_id = auth.uid() or is_admin(auth.uid()))
with check (author_id = auth.uid() or is_admin(auth.uid()));

create policy "agent tips author delete" on agent_tips
for delete using (author_id = auth.uid() or is_admin(auth.uid()));

create policy "agent tip votes public read" on agent_tip_votes
for select using (true);

create policy "agent tip votes consumer insert" on agent_tip_votes
for insert with check (
  consumer_id = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'consumer'
  )
);

create policy "agent tip votes consumer update" on agent_tip_votes
for update using (consumer_id = auth.uid())
with check (consumer_id = auth.uid());

create policy "agent tip votes consumer delete" on agent_tip_votes
for delete using (consumer_id = auth.uid());

-- ============================================================
-- 5. ENGAGEMENT POLICIES (20260219_engagement_policies.sql)
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'question_watchers' and policyname = 'watchers self select'
  ) then
    create policy "watchers self select"
      on question_watchers
      for select
      using (user_id = auth.uid() or is_admin(auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'question_watchers' and policyname = 'watchers self insert'
  ) then
    create policy "watchers self insert"
      on question_watchers
      for insert
      with check (user_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'question_watchers' and policyname = 'watchers self delete'
  ) then
    create policy "watchers self delete"
      on question_watchers
      for delete
      using (user_id = auth.uid());
  end if;
end
$$;

-- ============================================================
-- 6. MESSAGES UPDATE POLICY (20260219_messages_update_policy.sql)
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages' and policyname = 'messages receiver update read'
  ) then
    create policy "messages receiver update read"
      on messages
      for update
      using (receiver_id = auth.uid())
      with check (receiver_id = auth.uid());
  end if;
end
$$;

-- ============================================================
-- 7. PROFILES INSERT POLICY (20260219_profiles_insert_policy.sql)
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles self insert'
  ) then
    create policy "profiles self insert"
      on profiles
      for insert
      with check (id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles admin insert'
  ) then
    create policy "profiles admin insert"
      on profiles
      for insert
      with check (is_admin(auth.uid()));
  end if;
end
$$;

-- ============================================================
-- 8. PERFORMANCE INDEXES (20260220_performance_indexes.sql)
-- ============================================================

create index if not exists idx_questions_asked_by on questions(asked_by, created_at desc);
create index if not exists idx_questions_created on questions(created_at desc);
create index if not exists idx_questions_status on questions(status, created_at desc);
create index if not exists idx_questions_category on questions(category, created_at desc);
create index if not exists idx_questions_geo on questions(geo_scope, region, municipality);

create index if not exists idx_answers_question on answers(question_id, helpful_votes desc);
create index if not exists idx_answers_answered_by on answers(answered_by, created_at desc);

create index if not exists idx_answer_comments_answer on answer_comments(answer_id, created_at);

create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_role_verification on profiles(role, verification_status);

create index if not exists idx_messages_sender on messages(sender_id, created_at desc);
create index if not exists idx_messages_receiver on messages(receiver_id, read_at, created_at desc);
create index if not exists idx_messages_conversation on messages(
  least(sender_id, receiver_id),
  greatest(sender_id, receiver_id),
  created_at desc
);

create index if not exists idx_agent_areas_agent on agent_areas(agent_id);

create index if not exists idx_question_watchers_user on question_watchers(user_id, created_at desc);
create index if not exists idx_question_watchers_question on question_watchers(question_id);

create index if not exists idx_agent_group_members_group on agent_group_members(group_id);

create index if not exists idx_agent_tips_created on agent_tips(created_at desc);

create index if not exists idx_agent_tip_votes_consumer on agent_tip_votes(consumer_id, tip_id);

create index if not exists idx_lead_dispatch_agent on lead_dispatch_logs(agent_id, status);

-- ============================================================
-- 9. UPDATED_AT TRIGGERS (20260220_updated_at_triggers.sql)
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on profiles for each row execute function set_updated_at();

create trigger questions_set_updated_at
  before update on questions for each row execute function set_updated_at();

create trigger answers_set_updated_at
  before update on answers for each row execute function set_updated_at();

create trigger agent_groups_set_updated_at
  before update on agent_groups for each row execute function set_updated_at();

create trigger agent_tips_set_updated_at
  before update on agent_tips for each row execute function set_updated_at();

create trigger answer_votes_set_updated_at
  before update on answer_votes for each row execute function set_updated_at();

create trigger agent_tip_votes_set_updated_at
  before update on agent_tip_votes for each row execute function set_updated_at();

-- ============================================================
-- 10. B2B V1 (20260424_b2b_v1.sql)
-- ============================================================

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

-- ============================================================
-- DONE! All tables, policies, indexes and triggers created.
-- ============================================================

-- ============================================================
-- MäklarForum: Avatar storage + Friends
-- Run this in Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Create storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Storage policies for avatars
create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Authenticated users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Friends/connections table
create table if not exists agent_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique(requester_id, receiver_id)
);

alter table agent_connections enable row level security;

create policy "Users can read own connections"
  on agent_connections for select to authenticated
  using (requester_id = auth.uid() or receiver_id = auth.uid());

create policy "Users can create connection requests"
  on agent_connections for insert to authenticated
  with check (requester_id = auth.uid());

create policy "Users can update connections they received"
  on agent_connections for update to authenticated
  using (receiver_id = auth.uid());

create policy "Users can delete own connections"
  on agent_connections for delete to authenticated
  using (requester_id = auth.uid() or receiver_id = auth.uid());

create index if not exists idx_agent_connections_requester on agent_connections(requester_id);
create index if not exists idx_agent_connections_receiver on agent_connections(receiver_id);

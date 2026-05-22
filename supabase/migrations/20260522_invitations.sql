-- ============================================================
-- MäklarForum: Invitation tracking
-- Run this in Supabase Dashboard > SQL Editor > New query
-- ============================================================

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references profiles(id) on delete cascade,
  email text not null,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'pending',
  group_id uuid references agent_groups(id) on delete set null,
  registered_user_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  clicked_at timestamptz,
  registered_at timestamptz
);

alter table invitations enable row level security;

create policy "Users can read own invitations"
  on invitations for select to authenticated
  using (inviter_id = auth.uid());

create policy "Users can create invitations"
  on invitations for insert to authenticated
  with check (inviter_id = auth.uid());

create policy "Anyone can read by token for registration"
  on invitations for select to anon
  using (true);

create policy "Service can update invitations"
  on invitations for update to authenticated
  using (true);

create index if not exists idx_invitations_inviter on invitations(inviter_id);
create index if not exists idx_invitations_token on invitations(token);
create index if not exists idx_invitations_email on invitations(email);

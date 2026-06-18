-- ============================================================
-- In-app app_notifications + admin read access to invitations
-- Run in the SQL Editor of the production project (rjrj…).
-- ============================================================

-- 1) In-app app_notifications (bell). Rows are created by server actions using the
--    service-role key, so no INSERT policy is needed for normal users.
create table if not exists app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table app_notifications enable row level security;

create index if not exists idx_app_notifications_user_unread
  on app_notifications(user_id, read_at, created_at desc);

drop policy if exists "app_notifications read own" on app_notifications;
create policy "app_notifications read own" on app_notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "app_notifications update own" on app_notifications;
create policy "app_notifications update own" on app_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) Let admins read every invitation (for the admin invitation-tracking view).
--    Inviters already read their own via the existing policy.
drop policy if exists "invitations admin read" on invitations;
create policy "invitations admin read" on invitations
  for select to authenticated using (is_admin(auth.uid()));

-- 3) Track reminders so we can show "Påminnelse skickad".
alter table invitations add column if not exists reminded_at timestamptz;

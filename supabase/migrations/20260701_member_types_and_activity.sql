-- ============================================================
-- Member types (mäklare/assistent/student) + activity tracking
-- Run in the SQL Editor of the production project (rjrj…).
-- ============================================================

-- 1) Who the member is in the industry. Access control still uses `role`
--    (the app_role enum referenced by RLS policies) — member_type is
--    presentation/verification metadata, so no policy changes are needed.
alter table profiles
  add column if not exists member_type text not null default 'agent';

do $$
begin
  alter table profiles
    add constraint profiles_member_type_check
    check (member_type in ('agent', 'assistant', 'student'));
exception
  when duplicate_object then null;
end $$;

-- 2) Activity tracking for the inactivity reminder cron.
--    last_seen_at is bumped (throttled) on dashboard visits;
--    reactivation_email_sent_at prevents repeat reminders.
alter table profiles
  add column if not exists last_seen_at timestamptz not null default now();

alter table profiles
  add column if not exists reactivation_email_sent_at timestamptz;

create index if not exists idx_profiles_last_seen on profiles(last_seen_at);

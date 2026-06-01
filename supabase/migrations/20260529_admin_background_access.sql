-- ============================================================
-- Admin background access to all groups + email notification prefs
-- Run in Supabase Dashboard > SQL Editor.
-- ============================================================

-- 1. Admin should be able to follow every group WITHOUT being a member or
--    showing up in any member list. Read access already exists via the
--    is_admin(auth.uid()) clauses on agent_groups / agent_group_members and
--    the authenticated-read policies on questions/answers/polls. We only need
--    to remove admins from membership rows (an earlier seed added them to the
--    default group).
delete from agent_group_members m
using profiles p
where m.agent_id = p.id
  and p.role = 'admin';

-- 2. Email notifications: one master switch, on by default. The profiles table
--    already has a notification_prefs jsonb column. Make sure every row carries
--    an explicit email_notifications flag and set it as the column default so
--    new signups are opted in.
alter table profiles
  alter column notification_prefs
  set default jsonb_build_object(
    'email_notifications', true,
    'new_question_email', 'immediate',
    'new_message_email', 'immediate'
  );

update profiles
set notification_prefs = notification_prefs || jsonb_build_object('email_notifications', true)
where not (notification_prefs ? 'email_notifications');

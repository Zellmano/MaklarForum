-- Allow pending mäklare to send group join-requests.
-- Spec change: while waiting for admin verification, users can still browse
-- groups and apply to join them. They just can't be admitted until verified.

drop policy if exists "join requests agent create" on group_join_requests;

create policy "join requests agent create" on group_join_requests
for insert with check (
  agent_id = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role = 'agent'
      and p.verification_status in ('verified', 'pending')
  )
);

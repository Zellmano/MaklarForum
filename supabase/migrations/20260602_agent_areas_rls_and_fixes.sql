-- ============================================================
-- Agent areas RLS + group privacy hardening
-- Run in the SQL Editor of the production project (rjrj…).
-- ============================================================

-- agent_areas had RLS enabled but NO policies, so reads returned nothing and
-- inserts were blocked. Add self-manage + authenticated read.
drop policy if exists "agent areas read" on agent_areas;
create policy "agent areas read" on agent_areas
  for select to authenticated using (true);

drop policy if exists "agent areas insert own" on agent_areas;
create policy "agent areas insert own" on agent_areas
  for insert to authenticated with check (agent_id = auth.uid());

drop policy if exists "agent areas update own" on agent_areas;
create policy "agent areas update own" on agent_areas
  for update to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());

drop policy if exists "agent areas delete own" on agent_areas;
create policy "agent areas delete own" on agent_areas
  for delete to authenticated using (agent_id = auth.uid() or is_admin(auth.uid()));

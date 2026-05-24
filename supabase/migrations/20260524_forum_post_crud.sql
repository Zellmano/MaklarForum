-- Allow forum post authors to edit and delete their own posts.
-- Admins can edit/delete any post (for moderation).
--
-- Adds an `updated_at` column + trigger so we can show "redigerad"-indikator in UI later.

alter table forum_posts
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists forum_posts_set_updated_at on forum_posts;
create trigger forum_posts_set_updated_at
  before update on forum_posts
  for each row execute function set_updated_at();

-- Authors can update their own posts
create policy "forum posts author update" on forum_posts
for update using (
  author_id = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'agent' and p.verification_status = 'verified'
  )
)
with check (
  author_id = auth.uid()
);

-- Authors can delete their own posts
create policy "forum posts author delete" on forum_posts
for delete using (
  author_id = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'agent' and p.verification_status = 'verified'
  )
);

-- Admins can update/delete any post (moderation)
create policy "forum posts admin manage" on forum_posts
for all using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

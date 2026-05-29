-- Scale-readiness indexes.
-- Additions and composite variants that aren't covered by earlier migrations.
-- All use new names so existing single-column indexes are preserved alongside.

-- Forum
create index if not exists idx_forum_posts_created on forum_posts(created_at desc);
create index if not exists idx_forum_posts_category on forum_posts(category, created_at desc);
create index if not exists idx_forum_posts_author on forum_posts(author_id, created_at desc);
create index if not exists idx_forum_posts_recruiting on forum_posts(is_recruiting, created_at desc)
  where is_recruiting = true;

-- Group polls: hot list view sorts by created_at desc within a group.
create index if not exists idx_group_polls_group_created on group_polls(group_id, created_at desc);

-- "Have I voted on this poll?" — composite covers the lookup.
create index if not exists idx_group_poll_votes_voter_poll on group_poll_votes(voter_id, poll_id);

-- Invitations: rate-limit lookup is on inviter_id + created_at.
create index if not exists idx_invitations_inviter_created on invitations(inviter_id, created_at desc);

-- Connections with status (covers "incoming pending" and "outgoing pending").
create index if not exists idx_agent_connections_requester_status on agent_connections(requester_id, status);
create index if not exists idx_agent_connections_receiver_status on agent_connections(receiver_id, status);

-- User blocks: bidirectional lookup before every DM send. Critical for DM perf.
create index if not exists idx_user_blocks_blocker on user_blocks(blocker_id, blocked_id);
create index if not exists idx_user_blocks_blocked on user_blocks(blocked_id, blocker_id);

-- Pending-verification queue is admin's most-visited list. Partial keeps it tiny.
create index if not exists idx_profiles_verification_pending on profiles(verification_status, created_at desc)
  where verification_status = 'pending';

-- Default group lookup on every onboarding hit + dashboard load.
create index if not exists idx_agent_groups_default on agent_groups(is_default)
  where is_default = true;

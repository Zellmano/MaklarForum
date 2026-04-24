-- Performance indexes for scale (5,000–10,000+ users)

-- Questions: common query patterns
create index if not exists idx_questions_asked_by on questions(asked_by, created_at desc);
create index if not exists idx_questions_created on questions(created_at desc);
create index if not exists idx_questions_status on questions(status, created_at desc);
create index if not exists idx_questions_category on questions(category, created_at desc);
create index if not exists idx_questions_geo on questions(geo_scope, region, municipality);

-- Answers: FK lookup + sorting
create index if not exists idx_answers_question on answers(question_id, helpful_votes desc);
create index if not exists idx_answers_answered_by on answers(answered_by, created_at desc);

-- Answer comments
create index if not exists idx_answer_comments_answer on answer_comments(answer_id, created_at);

-- Answer votes
create index if not exists idx_answer_votes_answer on answer_votes(answer_id);
create index if not exists idx_answer_votes_consumer on answer_votes(consumer_id, answer_id);

-- Profiles: role-based lookups
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_role_verification on profiles(role, verification_status);

-- Messages: conversation lookups
create index if not exists idx_messages_sender on messages(sender_id, created_at desc);
create index if not exists idx_messages_receiver on messages(receiver_id, read_at, created_at desc);
create index if not exists idx_messages_conversation on messages(
  least(sender_id, receiver_id),
  greatest(sender_id, receiver_id),
  created_at desc
);

-- Agent areas
create index if not exists idx_agent_areas_agent on agent_areas(agent_id);

-- Question watchers
create index if not exists idx_question_watchers_user on question_watchers(user_id, created_at desc);
create index if not exists idx_question_watchers_question on question_watchers(question_id);

-- Agent groups & members
create index if not exists idx_agent_group_members_group on agent_group_members(group_id);
create index if not exists idx_agent_group_members_agent on agent_group_members(agent_id);
create index if not exists idx_agent_groups_status on agent_groups(status, name);

-- Agent tips
create index if not exists idx_agent_tips_author on agent_tips(author_id, created_at desc);
create index if not exists idx_agent_tips_created on agent_tips(created_at desc);

-- Agent tip votes
create index if not exists idx_agent_tip_votes_tip on agent_tip_votes(tip_id);
create index if not exists idx_agent_tip_votes_consumer on agent_tip_votes(consumer_id, tip_id);

-- Lead dispatch logs
create index if not exists idx_lead_dispatch_agent on lead_dispatch_logs(agent_id, status);

-- Moderation queue
create index if not exists idx_moderation_queue_status on moderation_queue(status, created_at);

-- Reported content
create index if not exists idx_reported_content_status on reported_content(status);

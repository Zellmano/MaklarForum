-- Lock down RLS: require authenticated session for reading internal community data.
-- Background: The anon key is public (NEXT_PUBLIC_), so `select using (true)` on
-- profiles/questions/answers/etc. exposed the full B2B community via the REST API
-- to anyone — even though middleware blocked the route-level UI. Spec says the
-- community is "Bara synlig för inloggade mäklare (B2B-community, inte publik SEO)".
--
-- After this migration, all reads on these tables require an authenticated session.
-- Writes are unaffected (their own INSERT/UPDATE/DELETE policies stay in place).

-- profiles
drop policy if exists "profiles public read" on profiles;

create policy "profiles authenticated read" on profiles
for select using (auth.uid() is not null);

-- questions
drop policy if exists "questions public read" on questions;

create policy "questions authenticated read" on questions
for select using (auth.uid() is not null);

-- answers
drop policy if exists "answers public read" on answers;

create policy "answers authenticated read" on answers
for select using (auth.uid() is not null);

-- answer_comments
drop policy if exists "answer comments public read" on answer_comments;

create policy "answer comments authenticated read" on answer_comments
for select using (auth.uid() is not null);

-- agent_tips
drop policy if exists "agent tips public read" on agent_tips;

create policy "agent tips authenticated read" on agent_tips
for select using (auth.uid() is not null);

-- answer_votes
drop policy if exists "answer votes public read" on answer_votes;

create policy "answer votes authenticated read" on answer_votes
for select using (auth.uid() is not null);

-- agent_tip_votes
drop policy if exists "agent tip votes public read" on agent_tip_votes;

create policy "agent tip votes authenticated read" on agent_tip_votes
for select using (auth.uid() is not null);

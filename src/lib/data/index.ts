import { agents as mockAgents, answers as mockAnswers, questions as mockQuestions } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { AgentGroup, AgentTip, ConversationMessage, ForumPost, MessageThread, PendingModerationItem, WatchedThread } from "@/lib/types";

export async function getQuestions() {
  if (!hasSupabaseEnv()) {
    return mockQuestions;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("questions")
    .select("id, question_slug, title, body, asked_by, audience, category, geo_scope, municipality, region, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    return mockQuestions;
  }

  const questionIds = data.map((q) => q.id);
  const { data: answerCounts } = questionIds.length > 0
    ? await supabase.from("answers").select("question_id").in("question_id", questionIds)
    : { data: [] as Array<{ question_id: string }> };

  const countMap = new Map<string, number>();
  for (const row of answerCounts ?? []) {
    countMap.set(row.question_id, (countMap.get(row.question_id) ?? 0) + 1);
  }

  return data.map((q) => ({
    id: q.id,
    slug: q.question_slug,
    title: q.title,
    body: q.body,
    askedBy: q.asked_by,
    audience: q.audience,
    category: q.category,
    geoScope: q.geo_scope,
    municipality: q.municipality ?? undefined,
    region: q.region ?? undefined,
    createdAt: q.created_at,
    helpfulVotes: 0,
    answerCount: countMap.get(q.id) ?? 0,
  }));
}

export async function getQuestionBySlug(slug: string) {
  if (!hasSupabaseEnv()) {
    return mockQuestions.find((q) => q.slug === slug) ?? null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: q } = await supabase
    .from("questions")
    .select("id, question_slug, title, body, asked_by, audience, category, geo_scope, municipality, region, created_at")
    .eq("question_slug", slug)
    .maybeSingle();

  if (!q) {
    return null;
  }

  const { count } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("question_id", q.id);

  return {
    id: q.id,
    slug: q.question_slug,
    title: q.title,
    body: q.body,
    askedBy: q.asked_by,
    audience: q.audience,
    category: q.category,
    geoScope: q.geo_scope,
    municipality: q.municipality ?? undefined,
    region: q.region ?? undefined,
    createdAt: q.created_at,
    helpfulVotes: 0,
    answerCount: count ?? 0,
  };
}

export async function getAnswersForQuestion(questionId: string, viewerId?: string) {
  if (!hasSupabaseEnv()) {
    return mockAnswers
      .filter((answer) => answer.questionId === questionId)
      .map((answer) => ({
        ...answer,
        upVotes: 0,
        downVotes: 0,
        myVote: 0 as const,
        agent: mockAgents.find((agent) => agent.id === answer.answeredBy) ?? null,
      }));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("answers")
    .select("id, question_id, answered_by, body, helpful_votes, created_at")
    .eq("question_id", questionId)
    .order("helpful_votes", { ascending: false });

  if (error || !data) {
    return [];
  }

  const agentIds = [...new Set(data.map((row) => row.answered_by))];
  const answerIds = data.map((row) => row.id);
  const [{ data: agentProfiles }, { data: voteRows }, { data: myVotes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, profile_slug, firm, title, city, bio, fmi_number, verification_status, subscription_status, avatar_url")
      .in("id", agentIds),
    supabase.from("answer_votes").select("answer_id, vote").in("answer_id", answerIds),
    viewerId
      ? supabase.from("answer_votes").select("answer_id, vote").eq("consumer_id", viewerId).in("answer_id", answerIds)
      : Promise.resolve({ data: [] as Array<{ answer_id: string; vote: number }> }),
  ]);

  const agentMap = new Map((agentProfiles ?? []).map((agent) => [agent.id, agent]));
  const voteBuckets = new Map<string, { up: number; down: number }>();
  for (const vote of voteRows ?? []) {
    const bucket = voteBuckets.get(vote.answer_id) ?? { up: 0, down: 0 };
    if (vote.vote === 1) bucket.up += 1;
    if (vote.vote === -1) bucket.down += 1;
    voteBuckets.set(vote.answer_id, bucket);
  }
  const myVoteMap = new Map<string, -1 | 0 | 1>();
  for (const vote of myVotes ?? []) {
    myVoteMap.set(vote.answer_id, vote.vote === -1 ? -1 : 1);
  }

  return data
    .map((row) => {
    const agent = agentMap.get(row.answered_by);
      const bucket = voteBuckets.get(row.id) ?? { up: 0, down: 0 };
      const score = bucket.up - bucket.down;
    return {
      id: row.id,
      questionId: row.question_id,
      answeredBy: row.answered_by,
      body: row.body,
        helpfulVotes: score,
        upVotes: bucket.up,
        downVotes: bucket.down,
        myVote: myVoteMap.get(row.id) ?? 0,
      createdAt: row.created_at,
      agent: agent
        ? {
            id: agent.id,
            fullName: agent.full_name,
            slug: agent.profile_slug,
            firm: agent.firm,
            title: agent.title,
            city: agent.city,
            municipalities: [],
            bio: agent.bio ?? "",
            fmiNumber: agent.fmi_number ?? "",
            verificationStatus: agent.verification_status,
            premium: agent.subscription_status === "active",
            soldCount: 0,
            activeCount: 0,
            profileViews: 0,
            avatarUrl: agent.avatar_url,
          }
        : null,
    };
    })
    .sort((a, b) => {
      if (b.helpfulVotes !== a.helpfulVotes) return b.helpfulVotes - a.helpfulVotes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export async function getAgents() {
  if (!hasSupabaseEnv()) {
    return mockAgents;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, profile_slug, firm, title, city, bio, fmi_number, verification_status, subscription_status, avatar_url")
    .eq("role", "agent")
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    return mockAgents;
  }

  return data.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    slug: row.profile_slug,
    firm: row.firm,
    title: row.title,
    city: row.city,
    municipalities: [],
    bio: row.bio ?? "",
    fmiNumber: row.fmi_number ?? "",
    verificationStatus: row.verification_status,
    premium: row.subscription_status === "active",
    soldCount: 0,
    activeCount: 0,
    profileViews: 0,
    avatarUrl: row.avatar_url,
  }));
}

export async function getAgentBySlug(slug: string) {
  if (!hasSupabaseEnv()) {
    return mockAgents.find((agent) => agent.slug === slug) ?? null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("profiles")
    .select("id, full_name, profile_slug, firm, title, city, bio, fmi_number, verification_status, subscription_status, avatar_url")
    .eq("role", "agent")
    .eq("profile_slug", slug)
    .maybeSingle();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name,
    slug: row.profile_slug,
    firm: row.firm,
    title: row.title,
    city: row.city,
    municipalities: [],
    bio: row.bio ?? "",
    fmiNumber: row.fmi_number ?? "",
    verificationStatus: row.verification_status,
    premium: row.subscription_status === "active",
    soldCount: 0,
    activeCount: 0,
    profileViews: 0,
    avatarUrl: row.avatar_url,
  };
}

export async function getAnswersByAgent(agentId: string) {
  if (!hasSupabaseEnv()) {
    return mockAnswers
      .filter((answer) => answer.answeredBy === agentId)
      .map((answer) => ({
        ...answer,
        question: mockQuestions.find((question) => question.id === answer.questionId) ?? null,
      }));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("answers")
    .select("id, question_id, body, helpful_votes, created_at")
    .eq("answered_by", agentId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const questionIds = [...new Set(data.map((row) => row.question_id))];
  const answerIds = data.map((row) => row.id);
  const [{ data: questions }, { data: votes }] = await Promise.all([
    supabase.from("questions").select("id, title").in("id", questionIds),
    supabase.from("answer_votes").select("answer_id, vote").in("answer_id", answerIds),
  ]);
  const questionMap = new Map((questions ?? []).map((question) => [question.id, question]));
  const voteMap = new Map<string, number>();
  for (const vote of votes ?? []) {
    voteMap.set(vote.answer_id, (voteMap.get(vote.answer_id) ?? 0) + (vote.vote === -1 ? -1 : 1));
  }

  return data.map((row) => ({
    id: row.id,
    questionId: row.question_id,
    body: row.body,
    helpfulVotes: voteMap.get(row.id) ?? 0,
    createdAt: row.created_at,
    question: questionMap.get(row.question_id) ?? null,
  }));
}

export async function getPendingAgentVerifications(limit = 100) {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, firm, fmi_number, created_at")
    .eq("role", "agent")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  return data ?? [];
}

export async function getAdminMetrics() {
  if (!hasSupabaseEnv()) {
    return {
      totalUsers: 0,
      verifiedAgents: 0,
      payingAgents: 0,
      flaggedItems: 0,
    };
  }

  const supabase = await createSupabaseServerClient();

  const [{ count: totalUsers }, { count: verifiedAgents }, { count: payingAgents }, { count: flaggedItems }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "agent").eq("verification_status", "verified"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "agent").eq("subscription_status", "active"),
    supabase.from("reported_content").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    verifiedAgents: verifiedAgents ?? 0,
    payingAgents: payingAgents ?? 0,
    flaggedItems: flaggedItems ?? 0,
  };
}

export async function getPendingGroupApprovals(limit = 100) {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("agent_groups")
    .select("id, name, municipality, region, created_at, created_by")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!data || data.length === 0) {
    return [];
  }

  const creatorIds = [...new Set(data.map((row) => row.created_by))];
  const { data: creators } = await supabase.from("profiles").select("id, full_name").in("id", creatorIds);
  const creatorMap = new Map((creators ?? []).map((creator) => [creator.id, creator.full_name]));

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    municipality: row.municipality ?? "",
    region: row.region ?? "",
    createdAt: row.created_at,
    createdBy: creatorMap.get(row.created_by) ?? "Mäklare",
  }));
}

export async function getPendingModerationItems(limit = 100): Promise<PendingModerationItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("moderation_queue")
    .select("id, question_id, proposed_by, body, blocked_terms, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!rows || rows.length === 0) {
    return [];
  }

  const questionIds = [...new Set(rows.map((row) => row.question_id).filter(Boolean))] as string[];
  const proposerIds = [...new Set(rows.map((row) => row.proposed_by))];

  const { data: questions } =
    questionIds.length > 0
      ? await supabase.from("questions").select("id, title").in("id", questionIds)
      : { data: [] as Array<{ id: string; title: string }> };
  const { data: proposers } = await supabase.from("profiles").select("id, full_name").in("id", proposerIds);

  const questionMap = new Map((questions ?? []).map((question) => [question.id, question.title]));
  const proposerMap = new Map((proposers ?? []).map((profile) => [profile.id, profile.full_name]));

  return rows.map((row) => ({
    id: row.id,
    questionId: row.question_id,
    questionTitle: row.question_id ? (questionMap.get(row.question_id) ?? "Okänd fråga") : "Okänd fråga",
    proposedBy: row.proposed_by,
    proposedByName: proposerMap.get(row.proposed_by) ?? "Mäklare",
    body: row.body,
    blockedTerms: row.blocked_terms ?? [],
    createdAt: row.created_at,
  }));
}

export async function getAgentProfile(userId: string) {
  if (!hasSupabaseEnv()) {
    return mockAgents[0];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, profile_slug, firm, title, city, bio, fmi_number, verification_status, subscription_status")
    .eq("id", userId)
    .single();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    fullName: data.full_name,
    slug: data.profile_slug,
    firm: data.firm,
    title: data.title,
    city: data.city,
    municipalities: [],
    bio: data.bio ?? "",
    fmiNumber: data.fmi_number ?? "",
    verificationStatus: data.verification_status,
    premium: data.subscription_status === "active",
    soldCount: 0,
    activeCount: 0,
    profileViews: 0,
  };
}

export async function getAgentLeadMetrics(userId: string) {
  if (!hasSupabaseEnv()) {
    return { sentTotal: 0, sentLast30Days: 0 };
  }

  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: sentTotal }, { count: sentLast30Days }] = await Promise.all([
    supabase.from("lead_dispatch_logs").select("id", { count: "exact", head: true }).eq("agent_id", userId).eq("status", "sent"),
    supabase
      .from("lead_dispatch_logs")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", userId)
      .eq("status", "sent")
      .gte("created_at", since),
  ]);

  return {
    sentTotal: sentTotal ?? 0,
    sentLast30Days: sentLast30Days ?? 0,
  };
}

export async function getAgentGroupsForUser(userId: string): Promise<AgentGroup[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: groups }, { data: memberships }] = await Promise.all([
    supabase
      .from("agent_groups")
      .select("id, name, slug, description, municipality, region, status")
      .in("status", ["approved", "pending"])
      .order("name", { ascending: true }),
    supabase.from("agent_group_members").select("group_id").eq("agent_id", userId),
  ]);

  if (!groups || groups.length === 0) {
    return [];
  }

  const groupIds = groups.map((group) => group.id);
  const { data: memberCounts } = await supabase
    .from("agent_group_members")
    .select("group_id")
    .in("group_id", groupIds);
  const memberCountMap = new Map<string, number>();
  for (const row of memberCounts ?? []) {
    memberCountMap.set(row.group_id, (memberCountMap.get(row.group_id) ?? 0) + 1);
  }

  const joined = new Set((memberships ?? []).map((row) => row.group_id));

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description ?? "",
    municipality: group.municipality ?? "",
    region: group.region ?? "",
    status: group.status,
    memberCount: memberCountMap.get(group.id) ?? 0,
    isMember: joined.has(group.id),
  }));
}

export async function getAgentDashboardQuestionFeed(userId: string): Promise<
  Array<{
    id: string;
    slug: string;
    title: string;
    category: string;
    geoScope: string;
    municipality: string | null;
    region: string | null;
    createdAt: string;
    answeredByMe: boolean;
  }>
> {
  if (!hasSupabaseEnv()) {
    return mockQuestions.slice(0, 20).map((question) => ({
      id: question.id,
      slug: question.slug,
      title: question.title,
      category: question.category,
      geoScope: question.geoScope,
      municipality: question.municipality ?? null,
      region: question.region ?? null,
      createdAt: question.createdAt,
      answeredByMe: false,
    }));
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: areaRows }, { data: answers }, { data: questions }] = await Promise.all([
    supabase.from("profiles").select("city").eq("id", userId).maybeSingle(),
    supabase.from("agent_areas").select("municipality, region").eq("agent_id", userId),
    supabase.from("answers").select("question_id").eq("answered_by", userId),
    supabase
      .from("questions")
      .select("id, question_slug, title, category, geo_scope, municipality, region, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (!questions || questions.length === 0) {
    return [];
  }

  const answeredIds = new Set((answers ?? []).map((row) => row.question_id));
  const municipalities = new Set<string>();
  const regions = new Set<string>();

  if (profile?.city) {
    municipalities.add(profile.city.toLowerCase());
  }

  for (const row of areaRows ?? []) {
    if (row.municipality) municipalities.add(row.municipality.toLowerCase());
    if (row.region) regions.add(row.region.toLowerCase());
  }

  const hasGeoPrefs = municipalities.size > 0 || regions.size > 0;

  const visible = questions.filter((question) => {
    if (!hasGeoPrefs) {
      return true;
    }

    if (question.geo_scope === "open") {
      return true;
    }

    if (question.geo_scope === "local") {
      return municipalities.has((question.municipality ?? "").toLowerCase());
    }

    if (question.geo_scope === "regional") {
      return regions.has((question.region ?? "").toLowerCase());
    }

    return true;
  });

  return visible.map((question) => ({
    id: question.id,
    slug: question.question_slug,
    title: question.title,
    category: question.category,
    geoScope: question.geo_scope,
    municipality: question.municipality,
    region: question.region,
    createdAt: question.created_at,
    answeredByMe: answeredIds.has(question.id),
  }));
}

export async function getWatchedThreads(userId: string): Promise<WatchedThread[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data: watcherRows } = await supabase
    .from("question_watchers")
    .select("question_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!watcherRows || watcherRows.length === 0) {
    return [];
  }

  const questionIds = watcherRows.map((row) => row.question_id);
  const [{ data: questionRows }, { data: answerRows }] = await Promise.all([
    supabase.from("questions").select("id, question_slug, title, created_at").in("id", questionIds),
    supabase.from("answers").select("question_id").in("question_id", questionIds),
  ]);

  const questionMap = new Map((questionRows ?? []).map((row) => [row.id, row]));
  const answerCountMap = new Map<string, number>();
  for (const row of answerRows ?? []) {
    answerCountMap.set(row.question_id, (answerCountMap.get(row.question_id) ?? 0) + 1);
  }

  return watcherRows
    .map((watch) => {
      const question = questionMap.get(watch.question_id);
      if (!question) return null;

      return {
        questionId: question.id,
        questionSlug: question.question_slug,
        title: question.title,
        createdAt: question.created_at,
        answerCount: answerCountMap.get(question.id) ?? 0,
      };
    })
    .filter((row): row is WatchedThread => Boolean(row));
}

export async function getMessageThreads(userId: string): Promise<MessageThread[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, body, read_at, created_at")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!rows || rows.length === 0) {
    return [];
  }

  const grouped = new Map<string, typeof rows>();

  for (const row of rows) {
    const otherUserId = row.sender_id === userId ? row.receiver_id : row.sender_id;
    const bucket = grouped.get(otherUserId) ?? [];
    bucket.push(row);
    grouped.set(otherUserId, bucket);
  }

  const otherIds = [...grouped.keys()];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, role").in("id", otherIds);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return [...grouped.entries()].map(([otherUserId, messages]) => {
    const latest = messages[0];
    const unreadCount = messages.filter((message) => message.receiver_id === userId && message.read_at === null).length;
    const other = profileMap.get(otherUserId);

    return {
      otherUserId,
      otherUserName: other?.full_name ?? "Användare",
      otherUserRole: (other?.role ?? "consumer") as "consumer" | "agent" | "admin",
      lastMessage: latest.body,
      lastMessageAt: latest.created_at,
      unreadCount,
    };
  });
}

export async function getPotentialMessageRecipientsFromWatched(userId: string): Promise<Array<{ id: string; name: string }>> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data: watched } = await supabase.from("question_watchers").select("question_id").eq("user_id", userId);
  const questionIds = watched?.map((row) => row.question_id) ?? [];
  if (questionIds.length === 0) {
    return [];
  }

  const { data: questions } = await supabase.from("questions").select("asked_by").in("id", questionIds);
  const userIds = [...new Set((questions ?? []).map((row) => row.asked_by).filter((id) => id !== userId))];
  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
  return (profiles ?? []).map((profile) => ({ id: profile.id, name: profile.full_name }));
}

export async function getConversation(userId: string, otherUserId: string): Promise<ConversationMessage[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, body, created_at, read_at")
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order("created_at", { ascending: true })
    .limit(500);

  if (!rows || rows.length === 0) {
    return [];
  }

  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", [userId, otherUserId]);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

  return rows.map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    senderName: profileMap.get(row.sender_id) ?? "Användare",
  }));
}

export async function markConversationAsRead(userId: string, otherUserId: string) {
  if (!hasSupabaseEnv()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("receiver_id", userId)
    .eq("sender_id", otherUserId)
    .is("read_at", null);
}

export async function getVerifiedAgentRecipients() {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, city, firm")
    .eq("role", "agent")
    .eq("verification_status", "verified")
    .order("full_name", { ascending: true })
    .limit(500);

  return (data ?? []).map((agent) => ({
    id: agent.id,
    name: `${agent.full_name}${agent.city ? ` - ${agent.city}` : ""}${agent.firm ? ` (${agent.firm})` : ""}`,
  }));
}

export async function getAgentTips(viewerId?: string, limit = 20): Promise<AgentTip[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("agent_tips")
    .select("id, author_id, title, body, audience, geo_scope, municipality, region, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows || rows.length === 0) {
    return [];
  }

  const tipIds = rows.map((row) => row.id);
  const authorIds = [...new Set(rows.map((row) => row.author_id))];
  const [{ data: authors }, { data: voteRows }, { data: myVotes }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", authorIds),
    supabase.from("agent_tip_votes").select("tip_id, vote").in("tip_id", tipIds),
    viewerId
      ? supabase.from("agent_tip_votes").select("tip_id, vote").eq("consumer_id", viewerId).in("tip_id", tipIds)
      : Promise.resolve({ data: [] as Array<{ tip_id: string; vote: number }> }),
  ]);

  const authorMap = new Map((authors ?? []).map((author) => [author.id, author.full_name]));
  const voteMap = new Map<string, { up: number; down: number }>();
  for (const vote of voteRows ?? []) {
    const bucket = voteMap.get(vote.tip_id) ?? { up: 0, down: 0 };
    if (vote.vote === 1) bucket.up += 1;
    if (vote.vote === -1) bucket.down += 1;
    voteMap.set(vote.tip_id, bucket);
  }

  const myVoteMap = new Map<string, -1 | 0 | 1>();
  for (const vote of myVotes ?? []) {
    myVoteMap.set(vote.tip_id, vote.vote === -1 ? -1 : 1);
  }

  return rows
    .map((row) => {
      const votes = voteMap.get(row.id) ?? { up: 0, down: 0 };
      return {
        id: row.id,
        authorId: row.author_id,
        authorName: authorMap.get(row.author_id) ?? "Mäklare",
        title: row.title,
        body: row.body,
        audience: row.audience,
        geoScope: row.geo_scope,
        municipality: row.municipality ?? undefined,
        region: row.region ?? undefined,
        score: votes.up - votes.down,
        upVotes: votes.up,
        downVotes: votes.down,
        myVote: myVoteMap.get(row.id) ?? 0,
        createdAt: row.created_at,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export async function getAgentTipsByAuthor(authorId: string, viewerId?: string): Promise<AgentTip[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("agent_tips")
    .select("id, author_id, title, body, audience, geo_scope, municipality, region, created_at")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!rows || rows.length === 0) {
    return [];
  }

  const tipIds = rows.map((row) => row.id);
  const [{ data: voteRows }, { data: myVotes }] = await Promise.all([
    supabase.from("agent_tip_votes").select("tip_id, vote").in("tip_id", tipIds),
    viewerId
      ? supabase.from("agent_tip_votes").select("tip_id, vote").eq("consumer_id", viewerId).in("tip_id", tipIds)
      : Promise.resolve({ data: [] as Array<{ tip_id: string; vote: number }> }),
  ]);

  const voteMap = new Map<string, { up: number; down: number }>();
  for (const vote of voteRows ?? []) {
    const bucket = voteMap.get(vote.tip_id) ?? { up: 0, down: 0 };
    if (vote.vote === 1) bucket.up += 1;
    if (vote.vote === -1) bucket.down += 1;
    voteMap.set(vote.tip_id, bucket);
  }

  const myVoteMap = new Map<string, -1 | 0 | 1>();
  for (const vote of myVotes ?? []) {
    myVoteMap.set(vote.tip_id, vote.vote === -1 ? -1 : 1);
  }

  return rows
    .map((row) => {
      const votes = voteMap.get(row.id) ?? { up: 0, down: 0 };
      return {
        id: row.id,
        authorId: row.author_id,
        authorName: "",
        title: row.title,
        body: row.body,
        audience: row.audience,
        geoScope: row.geo_scope,
        municipality: row.municipality ?? undefined,
        region: row.region ?? undefined,
        score: votes.up - votes.down,
        upVotes: votes.up,
        downVotes: votes.down,
        myVote: myVoteMap.get(row.id) ?? 0,
        createdAt: row.created_at,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export async function getForumPosts(limit = 50): Promise<ForumPost[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("forum_posts")
    .select("id, author_id, category, title, body, reply_count, is_recruiting, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows || rows.length === 0) {
    return [];
  }

  const authorIds = [...new Set(rows.map((row) => row.author_id))];
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", authorIds);

  const authorMap = new Map(
    (authors ?? []).map((a) => [
      a.id,
      { name: (a.full_name as string) ?? "Okänd mäklare", avatarUrl: (a.avatar_url as string | null) ?? null },
    ])
  );

  return rows.map((row) => {
    const author = authorMap.get(row.author_id);
    return {
      id: row.id,
      authorId: row.author_id,
      authorName: author?.name ?? "Okänd mäklare",
      authorAvatarUrl: author?.avatarUrl ?? null,
      category: row.category,
      title: row.title,
      body: row.body,
      replyCount: row.reply_count ?? 0,
      isRecruiting: row.is_recruiting ?? false,
      createdAt: row.created_at,
    };
  });
}

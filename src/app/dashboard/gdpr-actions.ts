"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function exportMyDataAction(): Promise<{ error?: string; data?: string }> {
  const user = await requireUser("/dashboard/profil");
  const supabase = await createSupabaseServerClient();

  const [
    profile,
    areas,
    questions,
    answers,
    answerComments,
    answerVotes,
    tips,
    tipVotes,
    forumPosts,
    messagesSent,
    messagesReceived,
    watchers,
    groupMembers,
    joinRequests,
    connections,
    invitations,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("agent_areas").select("*").eq("agent_id", user.id),
    supabase.from("questions").select("*").eq("asked_by", user.id),
    supabase.from("answers").select("*").eq("answered_by", user.id),
    supabase.from("answer_comments").select("*").eq("author_id", user.id),
    supabase.from("answer_votes").select("*").eq("consumer_id", user.id),
    supabase.from("agent_tips").select("*").eq("author_id", user.id),
    supabase.from("agent_tip_votes").select("*").eq("consumer_id", user.id),
    supabase.from("forum_posts").select("*").eq("author_id", user.id),
    supabase.from("messages").select("*").eq("sender_id", user.id),
    supabase.from("messages").select("*").eq("receiver_id", user.id),
    supabase.from("question_watchers").select("*").eq("user_id", user.id),
    supabase.from("agent_group_members").select("*").eq("agent_id", user.id),
    supabase.from("group_join_requests").select("*").eq("agent_id", user.id),
    supabase
      .from("agent_connections")
      .select("*")
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`),
    supabase.from("invitations").select("*").eq("inviter_id", user.id),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
    },
    profile: profile.data,
    agent_areas: areas.data ?? [],
    questions: questions.data ?? [],
    answers: answers.data ?? [],
    answer_comments: answerComments.data ?? [],
    answer_votes: answerVotes.data ?? [],
    agent_tips: tips.data ?? [],
    agent_tip_votes: tipVotes.data ?? [],
    forum_posts: forumPosts.data ?? [],
    messages_sent: messagesSent.data ?? [],
    messages_received: messagesReceived.data ?? [],
    question_watchers: watchers.data ?? [],
    agent_group_members: groupMembers.data ?? [],
    group_join_requests: joinRequests.data ?? [],
    agent_connections: connections.data ?? [],
    invitations_sent: invitations.data ?? [],
  };

  return { data: JSON.stringify(payload, null, 2) };
}

export async function deleteMyAccountAction(
  _: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser("/dashboard/profil");

  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation !== "RADERA") {
    return { error: "Skriv RADERA exakt för att bekräfta." };
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return {
      error: "Kontoradering är inte tillgängligt just nu. Kontakta maklarforum@gmail.com.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return { error: `Kunde inte radera kontot: ${error.message}` };
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/?deleted=1");
}
